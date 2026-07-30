# SDKWork Sandbox Local Provider

Domain: `intelligence`

Capability: `sandbox-local-execution`

Package type: Rust provider adapter

Status: foundation scaffold with a test-only fake host boundary

## Public API

No provider implementation is published in Phase 0.

The crate includes a `#[cfg(test)]` fake host boundary that exercises logical
relative-path rejection, logical executable syntax before allowlist lookup,
typed argument preservation, protected/sensitive environment rejection,
NUL/CR/LF rejection, and request bounds synchronized with the command
contracts. It performs no host filesystem access and starts no process; it is
pre-review test evidence, not a Local Provider or isolation claim.

## Required SDK Surface

None.

## Configuration

No host roots, executable allowlists, environment variables, browser bindings, or network policies are accepted yet.

## Deployment Profile And Runtime Target Behavior

This adapter is reserved for `standalone` local execution. Windows and Linux Terminal support remains blocked on real Job Object and delegated cgroup v2 conformance respectively; macOS Terminal is explicitly denied until detached-descendant containment is proven. It is not a cloud or multi-tenant isolation boundary.

## Security

Future implementation must consume already-opened Workspace and runtime capability handles, perform handle-relative no-follow and file-identity verification, and reject string canonicalization/check-then-open as a security boundary. It must use platform-specific descendant supervision and a Runtime-Binding-scoped immutable execution policy. Executables resolve only through a Provider-owned logical registry without caller paths, OS PATH search, or working-directory lookup. The bounded environment starts empty; callers cannot extend policy or override protected Provider values. Private Host data is redacted and unverified network access is denied. Docker sockets, ambient credentials, implicit shell execution, arbitrary Host roots, and ID-to-path derivation are forbidden.

## Extension Points

The adapter will implement the reviewed provider SPI; Phase 0 declares no binding.

## Verification

- `cargo test -p sdkwork-sandbox-provider-local`
- `node --test tests/contract/sandbox-local-provider-host-boundary.contract.test.mjs`
