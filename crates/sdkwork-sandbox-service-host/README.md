# SDKWork Sandbox Service Host

Domain: `intelligence`

Capability: `sandbox-service-host`

Package type: Rust service-host composition crate

Status: foundation scaffold

Candidate contract: [Sandbox Service Host Composition Contract](specs/sandbox-service-host-composition.contract.json). The contract remains `draft`, requires human review, and does not authorize runtime wiring.

## Public API

No service container or bootstrap API is published in Phase 0.

## Required SDK Surface

None.

## Configuration

The host has no active config keys. Future config must be typed, sourced from `etc/`, and mapped to user-private runtime directories without embedding secrets in source.

## Deployment Profile And Runtime Target Behavior

The host will assemble standalone and cloud compositions from the same service and port contracts. It will not mount HTTP routes; an approved standalone gateway will own any future listener.

## Security

Composition must fail closed when provider isolation, secrets, quotas, or required infrastructure are unavailable.

## Extension Points

Future runtime composition will bind service ports and provider adapters declared in component specs.

## Verification

```bash
cargo check -p sdkwork-sandbox-service-host
node --test tests/contract/sandbox-service-host-composition.contract.test.mjs
```
