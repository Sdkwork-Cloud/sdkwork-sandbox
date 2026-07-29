# SDKWork Intelligence Sandbox Memory Repository

## Purpose

Implements the Sandbox lifecycle repository port for deterministic tests and single-process development composition.

## Owner

SDKWork Runtime Platform.

## Allowed

- Tenant-scoped in-memory `SandboxSession` lifecycle projections.
- Create-operation uniqueness and optimistic version checks.
- Tenant-partitioned ordered Session indexes with bounded reconciliation keyset iteration.
- `InvalidPageRequest` parity and exact continuation behavior with the PostgreSQL adapter.
- Deterministic repository behavior tests.

## Forbidden

- Production durability, high-availability, multi-process coordination, or persistence claims.
- Lifecycle policy, Provider selection, HTTP, SDK, Host execution, or Secret handling.
- Agent Workspace or Agent Session identity creation and business persistence.

## Related Specs

- `../../../sdkwork-specs/APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`
- `../../../sdkwork-specs/COMPONENT_SPEC.md`
- `../../../sdkwork-specs/RUST_CODE_SPEC.md`
- `../../../sdkwork-specs/TEST_SPEC.md`

## Verification

```bash
cargo test -p sdkwork-intelligence-sandbox-repository-memory
```
