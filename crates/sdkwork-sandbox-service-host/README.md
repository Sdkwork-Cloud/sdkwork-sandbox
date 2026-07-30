# SDKWork Sandbox Service Host

Domain: `intelligence`

Capability: `sandbox-service-host`

Package type: Rust service-host composition crate

Status: foundation scaffold

Candidate contracts: [Sandbox Service Host Composition Contract](specs/sandbox-service-host-composition.contract.json) and [Sandbox Service Host Bootstrap Contract](specs/sandbox-service-host-bootstrap.contract.json). They define fail-closed common, `standalone/local`, `standalone/firecracker`, `cloud/firecracker`, optional Runtime Pool, Command and Terminal gates, plus the safe config, preopened runtime-directory capability, repository-only persistence, Secret/KMS, bounded Telemetry and ordered bootstrap boundaries. `standalone/local` additionally requires the repository-wide Standalone Data Residency contract; neither `standalone` nor Local Provider identity alone proves device locality. Both Host contracts remain `draft`, require human review, and do not authorize runtime wiring.

## Public API

No service container or bootstrap API is published in Phase 0.

## Required SDK Surface

None.

## Configuration

The host has no active config keys. The candidate boundary accepts only normalized safe config and preopened least-privilege `SandboxRuntimeDirectoryCapabilities`; it never receives physical paths, database connection material, or raw secrets. The eight source profiles are contractual only, and no `etc/` materialization is authorized.

## Deployment Profile And Runtime Target Behavior

The host will assemble standalone and cloud compositions from the same service and port contracts. Local readiness is independent of Firecracker block-device mechanisms but depends on approved four-repository data-residency, database-role, backup/restore and purge evidence. Cold Firecracker is independent of the optional Pool overlay. The host will not mount HTTP routes; an approved standalone gateway will own any future listener.

## Security

Composition must fail closed when a dependency is missing, unknown, draft, pending review, unauthorized, or does not satisfy the selected Provider/Profile/Capability evidence. A Provider descriptor alone cannot enable Command or Terminal. The host receives a ready `SandboxSessionRepository`, not a concrete database pool; Redis remains disabled. The Telemetry adapter must retain bounded acceptance, redaction and drop accounting even when an external exporter is degraded.

## Extension Points

Future runtime composition will bind service ports and provider adapters declared in component specs.

## Verification

```bash
cargo check -p sdkwork-sandbox-service-host
node --test tests/contract/sandbox-service-host-composition.contract.test.mjs
node --test tests/contract/sandbox-service-host-bootstrap.contract.test.mjs
```
