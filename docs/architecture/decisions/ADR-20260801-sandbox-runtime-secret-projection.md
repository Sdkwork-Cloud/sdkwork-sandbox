# ADR-20260801: Sandbox Runtime Secret Projection

Status: proposed

Requirement: [REQ-2026-0025](../../product/requirements/REQ-2026-0025-sandbox-runtime-secret-projection.md)

Owner: SDKWork Runtime Platform

Date: 2026-08-01

Deciders: Product, Sandbox, Kernel, Agents, IAM, Secret/KMS, Local Platform, Firecracker, Security/Privacy, Reliability and Operations owners

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `CONFIG_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`

## Context

Credentialed builds are required, but every current Sandbox execution contract correctly starts with an empty environment and excludes Secret values. Moving values through higher-layer requests or Sandbox persistence would couple Secret custody to execution placement and create durable cross-tenant residue. Local-only data claims would also be false if a device Secret were silently synchronized to Cloud.

An opaque grant is necessary but is itself a sensitive capability. It must be minted after placement, bound to the exact execution and fencing scope, consumed only by an approved target adapter, and never used as a durable recovery token. The projection target must remain outside Workspace and every reusable Runtime artifact.

## Decision

1. Introduce a candidate `SandboxRuntimeSecretProjectionPort` at the Sandbox application-service boundary, separate from Provider lifecycle, Command, Terminal, storage, and Secret/KMS mechanisms.
2. Preserve split authority: Agents owns business use intent; IAM owns principal/Tenant authorization; an approved Secret Authority owns value, immutable version and access decision; Kernel forwards opaque grants; Sandbox owns projection lifecycle, fencing, cleanup and quarantine.
3. Mint a short-lived opaque grant only after placement facts exist. Bind it to Tenant, Workspace Revision/Transaction, Runtime Binding, Kernel placement generation, Sandbox fence, Provider assurance, attested target, Local/Cloud lane, region, execution audience, logical target, purpose and expiry.
4. Treat the opaque grant as credential-grade sensitive. Do not persist it, log it, return it, expose it as an identifier, or use it for crash recovery. Persist only value-free lifecycle facts and a bounded correlation digest. Recovery requires a newly authorized grant or fails closed.
5. Resolve values only inside an approved node/device/guest projection adapter over workload identity or an opened protected capability. The Sandbox control plane and higher repositories do not receive values.
6. Support candidate process descriptor/handle and protected ephemeral file targets. Process environment is a disabled-by-default exception requiring an explicit target grant and platform evidence; it is constructed only for a new process tree and cannot mutate a running process or Host/Service environment.
7. Resolve every target from an immutable Runtime-Binding registry. Forbid host/workspace/image paths, caller target names, CLI arguments, command strings, login profiles, ambient environment, arbitrary Secret references and weaker fallback.
8. Keep material in bounded zeroizing memory or a protected ephemeral target, separate from Workspace and excluded from Checkpoint, Snapshot, pool image, cache, logs, events, core dump, crash report and support bundle. Apply material atomically and verify identity/permissions without path races.
9. Use immutable Secret versions and monotonic projection generations. File/handle rotation atomically replaces a generation; environment rotation replaces the consuming process. Approved overlap is finite.
10. Revocation, expiry or freeze blocks new use, drains or terminates consumers, removes targets, zeroizes material, verifies residue, and precedes Checkpoint/release. Cleanup uncertainty quarantines capacity. Authority outage never extends a grant or changes Authority.
11. Never return a Secret-exposed Runtime to a tenant-neutral prepared/warm pool. Destroy Cloud microVMs after release and require evidence before any lower-level host capacity is reused.
12. Separate audits: Secret Authority owns access/version/rotation/revocation facts; Sandbox owns value-free projection/cleanup facts. Known-value redaction is defense in depth. The product does not claim to prevent authorized tenant code from copying or transforming a delivered value.
13. Local and Cloud use distinct approved Authorities. Local values do not synchronize or fall back to Cloud; Cloud resolution stays in the bound region and never falls back to a Local/device Authority or another region.

## Alternatives

### Put Secret Values In Command Or Terminal Requests

Rejected because BirdCoder, Agents, Kernel, transports, idempotency records and Sandbox persistence would all become Secret custodians.

### Store Encrypted Values In Sandbox PostgreSQL

Rejected because encryption would not correct authority ownership, retention, grant audience, region, or process-delivery boundaries. Sandbox is not a Secret Manager.

### Inject All Secrets Through Environment Variables

Rejected because process inspection, inheritance, crash dumps and immutable running environments expand exposure. Environment projection remains an explicit exception for tools that cannot consume a descriptor/file target.

### Keep Secret-Exposed Warm MicroVMs

Rejected because sanitization cannot prove removal of every value or tenant-created derivative from memory and guest state at commercial multi-tenant assurance.

### Persist Opaque Grants For Restart

Rejected because a grant is a bearer-like capability. Restart obtains a new authorization or closes the affected execution path.

### Promise To Prevent Tenant-Code Exfiltration

Rejected because code legitimately receiving a Secret can transform or copy it. Network, output, Workspace and policy controls reduce exposure but cannot support an absolute claim.

## Consequences

- Sandbox stays replaceable across Local and Firecracker mechanisms without owning Secret custody.
- Higher layers remain value-free and cross-tenant recovery cannot replay a durable bearer grant.
- Secret-exposed Cloud Runtimes lose warm-pool reuse, increasing cost and cold-start pressure.
- Long-running environment consumers require process restart for rotation.
- Real product claims must distinguish platform-managed projection safety from tenant-code behavior.
- Commercial readiness now has a reviewable Secret gate but no implementation authority.

## Verification

- Static tests validate ownership, value-free contracts, grant binding, Local/Cloud separation, target modes, lifecycle/fencing, memory/persistence exclusions, rotation/revocation/outage, checkpoint/pool ordering, observability and no-implementation gates.
- Future conformance runs on supported Local operating systems and real Linux KVM/Firecracker with the selected Secret Authorities.
- Cross-repository tests prove Agents authorization and Kernel grant handoff without Secret-value visibility or direct BirdCoder/Agents-to-Sandbox access.

## Implementation Boundary

This proposed ADR does not authorize public names, a Rust Port/type, Secret Authority/KMS/Keychain, Host Broker/guest-agent method, Secret-value transport, process projection, RPC/API/SDK, persistence, cache, config, Service Host, Provider, deployment, or cross-repository source change.

## Supersedes / Superseded By

This decision supplies the Runtime Secret gate deferred by the Command, Service Host, Workspace Runtime Transaction, Standalone Data Residency, Runtime Pool and commercial-readiness decisions. It does not supersede their ownership or implementation gates.
