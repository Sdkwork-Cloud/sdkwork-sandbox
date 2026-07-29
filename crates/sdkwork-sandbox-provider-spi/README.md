# SDKWork Sandbox Provider SPI

Domain: `intelligence`

Capability: `sandbox-provider`

Package type: Rust crate

Status: `0.1` lifecycle contract candidate under `REQ-2026-0002`

## Public API

The crate exports Sandbox-qualified opaque runtime identities, Provider descriptors, Runtime Capability and Isolation Assurance values, typed Provider errors, lifecycle requests/outcomes, and the async `SandboxProvider` port. `SandboxSessionId` and `SandboxWorkspaceId` are parsed references supplied through the Kernel adapter; only `SandboxId`, `SandboxRuntimeBindingId`, and `OperationId` are generated here. These names remain review candidates until the lifecycle ADR is accepted.

## Required SDK Surface

None.

## Configuration

No runtime configuration keys are owned here. Provider selection policy remains in the lifecycle service.

## Deployment Profile And Runtime Target Behavior

The future SPI must remain independent of `standalone` versus `cloud` and of concrete provider implementations.

## Security

Provider contracts must be capability-oriented, fail closed, and avoid exposing host paths, credentials, or provider-private metadata.

## Extension Points

Provider adapters implement `SandboxProvider` and report Capability, Isolation Assurance, Health, and lifecycle readiness without exposing private allocation details.

## Verification

`cargo test -p sdkwork-sandbox-provider-spi`
