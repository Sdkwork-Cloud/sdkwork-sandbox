# SDKWork Sandbox Local Provider

Domain: `intelligence`

Capability: `sandbox-local-execution`

Package type: Rust provider adapter

Status: foundation scaffold with a test-only fake host boundary

## Public API

No provider implementation is published in Phase 0.

The crate includes a `#[cfg(test)]` fake host boundary that exercises logical
relative-path rejection, executable/environment allowlists, typed argument
preservation, and request bounds. It performs no host filesystem access and
starts no process; it is pre-review test evidence, not a Local Provider or
isolation claim.

## Required SDK Surface

None.

## Configuration

No host roots, executable allowlists, environment variables, browser bindings, or network policies are accepted yet.

## Deployment Profile And Runtime Target Behavior

This adapter is reserved for `standalone` local execution on Windows, macOS, and Linux. It is not a cloud isolation boundary.

## Security

Future implementation must use capability-based access, canonical path containment, explicit process and network policy, secret redaction, and deny-by-default host access. It must never mount Docker sockets or inherit unrestricted host credentials by default.

## Extension Points

The adapter will implement the reviewed provider SPI; Phase 0 declares no binding.

## Verification

`cargo test -p sdkwork-sandbox-provider-local`
