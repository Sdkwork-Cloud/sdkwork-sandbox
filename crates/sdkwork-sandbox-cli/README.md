# SDKWork Sandbox CLI

Domain: `intelligence`

Capability: `sandbox-cli`

Package type: Rust binary crate

Status: foundation scaffold

## Public API

No CLI command is exposed in Phase 0. The binary entrypoint intentionally performs no action.

## Required SDK Surface

None.

## Configuration

No flags, environment variables, or config files are accepted yet.

## Deployment Profile And Runtime Target Behavior

The CLI is reserved for the standalone local runtime target. Remote control will use an approved generated SDK rather than ad hoc HTTP.

## Security

Future commands must require explicit targets and confirmations for destructive operations, redact secrets, and never broaden filesystem access implicitly.

## Extension Points

CLI commands will call the service-host/public application boundary; they will not implement lifecycle or provider policy directly.

## Verification

`cargo check -p sdkwork-sandbox-cli`
