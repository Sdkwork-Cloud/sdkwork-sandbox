# SDKWork Sandbox

repository-kind: application

SDKWork Sandbox is the execution-environment application for SDKWork agents. It provides the product and architecture boundary for local and remote Runtime, `SandboxSession`, Workspace Attachment, Sandbox Provider, resource policy, terminal access, snapshots, events, and operational telemetry. `sdkwork-agents` remains the authority for `AgentWorkspace` and `AgentSession`; Kernel maps authorized IDs into `SandboxWorkspaceId` and `SandboxSessionId`. The repository contains Provider-neutral lifecycle, Memory Repository, PostgreSQL Repository, encrypted Provider recovery metadata, Lease/Fencing, and transient reconciliation candidates. No production Sandbox Provider, Service Host composition, Runtime API, or release deployment is implemented yet.

## Status

- Lifecycle, PostgreSQL persistence, and allocation key rotation: verified candidates including live PostgreSQL migration, concurrency, recovery, and re-encryption evidence; pending human architecture/security review and production operations gates
- Application code: `sandbox`
- Primary language: Rust
- Primary app surface: repository root (planned CLI and service host)
- Current phase: V1 lifecycle core after accepted Phase 0 foundation

## Documentation

- [Documentation index](docs/README.md)
- [Product PRD](docs/product/prd/PRD.md)
- [Technical architecture](docs/architecture/tech/TECH_ARCHITECTURE.md)
- [Application surfaces](apps/README.md)
- [Repository contracts](specs/README.md)

## Active Layout

The complete SDKWork top-level directory dictionary is initialized so capability ownership is explicit. `crates/`, `database/`, `docs/`, `specs/`, and `tests/` are active. Provider SPI, lifecycle service, non-production Memory Repository, PostgreSQL Repository candidate, bounded allocation key re-encryption, and authoritative-server database assets are implemented; Local Provider, Service Host, and CLI remain inactive. `apis/`, `sdks/`, `jobs/`, `tools/`, `plugins/`, `examples/`, `etc/`, `deployments/`, and `scripts/` remain inactive until their owning requirement is ready.

Rust components live under `crates/`. The root is the primary application surface, so `apps/README.md` indexes the root and records that no secondary client surface exists yet. API contracts will be authored under `apis/` before route, SDK, or gateway implementation begins.

## Workspace

This repository is independently buildable from its own root and does not depend on `sdkwork-kernel` or `sdkwork-agents`. The cross-repository direction is `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`; sibling Sandbox dependencies are declared once in the Kernel root `Cargo.toml`, and Kernel member crates consume them through Cargo workspace dependencies.

## Verification

```bash
cargo fmt --all -- --check
cargo check --workspace
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node ../sdkwork-specs/tools/check-workspace-packages-layout.mjs --root . --mode enforce
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .
```

Global standards remain authoritative under `../sdkwork-specs/`; this repository links to them and does not copy their bodies.
