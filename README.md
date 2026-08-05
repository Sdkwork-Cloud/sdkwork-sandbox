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

The complete SDKWork top-level directory dictionary is initialized so capability ownership is explicit. `crates/`, `apis/`, `database/`, `docs/`, `specs/`, and `tests/` are active. Provider SPI, lifecycle service, non-production Memory Repository, PostgreSQL Repository candidate, bounded allocation key re-encryption, authoritative-server database assets, draft Sandbox event/command contracts, Local/Firecracker Provider gates, Local Host, Host Broker, Firecracker Artifact, Workspace Block Device, Network/Resource Isolation, Multi-tenant Scheduling, Node Trust, Quota/Capacity Persistence, Runtime Pool, Lifecycle Hot State/Idempotency, Workspace Runtime Transaction, Standalone Data Residency/Recovery, Internal Control Plane, Interactive Terminal, Runtime Secret Projection, Cloud Data Residency/Recovery, Cross-Repository Version Compatibility, and Service Host Bootstrap/Profile/Capability Gate 0 contracts are present. REQ-2026-0021 composes allocation, attachment, command, durable checkpoint handoff, compensation, sanitization and release across Local and Firecracker lanes while Agents remains Revision authority. REQ-2026-0022 separately governs an all-data Local claim across BirdCoder, Agents, Kernel, Sandbox, Workspace, database, cache, log, secret, backup and purge authorities; neither `standalone` nor Local Provider selection proves device locality. REQ-2026-0025 keeps Secret values outside BirdCoder/Agents/Kernel/Sandbox control-plane contracts and separates Local device authority from region-bound Cloud authority; REQ-2026-0026 keeps Cloud residency/recovery claims tied to explicit region/storage/replication/restore evidence; REQ-2026-0027 keeps four-repository release identity and multi-dimensional compatibility explicit; none of these gates authorizes runtime mechanisms. Service Host now resolves 18 fail-closed Gate dependencies: Workspace Runtime Transaction is common to all lanes, while Standalone Data Residency applies only to `sandbox_standalone_local`. REQ-2026-0018 still blocks quota/capacity persistence on the `tenant_id TEXT` to positive `BIGINT` migration, and REQ-2026-0020 still blocks lifecycle history retention and migration policy; until it is approved, repository reads are bounded by the `MAX_SANDBOX_SESSION_OPERATIONS` safety bound and fail closed above it. All new runtime mechanisms, cross-repository integration, API/SDK, storage/KMS, production profiles and deployment remain inactive and unauthorized. `sdks/`, `jobs/`, `tools/`, `plugins/`, `examples/`, `etc/`, `deployments/`, and `scripts/` remain inactive until their owning requirement is ready.

Rust components live under `crates/`. The root is the primary application surface, so `apps/README.md` indexes the root and records that no secondary client surface exists yet. API contracts will be authored under `apis/` before route, SDK, or gateway implementation begins.

## Workspace

This repository is independently buildable from its own root and does not depend on `sdkwork-kernel` or `sdkwork-agents`. The cross-repository direction is `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`; sibling Sandbox dependencies are declared once in the Kernel root `Cargo.toml`, and Kernel member crates consume them through Cargo workspace dependencies.

## Verification

```bash
cargo fmt --all -- --check
cargo check --workspace
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
node --test tests/contract/*.test.mjs
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node ../sdkwork-specs/tools/check-workspace-packages-layout.mjs --root . --mode enforce
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .
node tools/check-sandbox-commercial-readiness.mjs
```

Commercial release preflight must additionally run `node tools/check-sandbox-commercial-readiness.mjs --require-go`. It intentionally fails while the repository decision remains `NO-GO`; a green Gate 0 contract suite is not evidence of a runnable Sandbox product.

Live PostgreSQL 16/17 migration, repository, encryption and backup/restore evidence is available through the disposable loopback-only runner:

```bash
node tools/testing/sandbox-postgres-evidence.mjs --postgres-major 16
node tools/testing/sandbox-postgres-evidence.mjs --postgres-major 17
```

Global standards remain authoritative under `../sdkwork-specs/`; this repository links to them and does not copy their bodies.
