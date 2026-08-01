# sdkwork-sandbox Documentation

Purpose: route product, architecture, engineering, integration, operations, release, and historical documentation for SDKWork Sandbox.

Owner: SDKWork Runtime Platform maintainers.

Allowed content: Canon PRD and technical architecture, stable `REQ-*`/`ADR-*`/`PLAN-*`/`REVIEW-*` working records, guides, runbooks, changelogs, migrations, releases, domain extensions, and archives. Forbidden content: copied global standards, sole-source machine contracts, generated SDK transports, runtime state, credentials, and private environment values.

## Audience Routing

| I am… | Read first | Then read |
| --- | --- | --- |
| Product or business | [product/prd/PRD.md](product/prd/PRD.md) | [product/requirements/](product/requirements/) |
| Architect | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) | [architecture/decisions/](architecture/decisions/) |
| Developer | [guides/developer/README.md](guides/developer/README.md) | [engineering/plans/](engineering/plans/) |
| Operator | [guides/operator/README.md](guides/operator/README.md) | [runbooks/](runbooks/) |
| Integrator | [guides/integrator/README.md](guides/integrator/README.md) | repository `apis/` and `sdks/` |
| Agent | [../AGENTS.md](../AGENTS.md) | [INDEX.yaml](INDEX.yaml) |

## Canon Documents

| Document | Path |
| --- | --- |
| Product PRD | [product/prd/PRD.md](product/prd/PRD.md) |
| Technical architecture | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) |

## Related Specs

- `DOCUMENTATION_SPEC.md`
- `SDKWORK_WORKSPACE_SPEC.md`
- `REQUIREMENTS_SPEC.md`
- `ARCHITECTURE_DECISION_SPEC.md`

## Active Delivery Focus

[PLAN-2026-0001: Local And Firecracker Sandbox Provider Delivery](engineering/plans/PLAN-2026-0001-local-and-firecracker-provider-delivery.md) fixes the Provider delivery order as Local, shared Command/Terminal conformance, then Firecracker. [PLAN-2026-0002: Commercial Cloud Agent Runtime Delivery](engineering/plans/PLAN-2026-0002-commercial-cloud-agent-runtime-delivery.md) extends that sequence through trusted-node scheduling, optional Runtime Pool acceleration, durable Workspace Checkpoint handoff, Kernel integration, operations, and release evidence. [REVIEW-20260731: Sandbox Commercial Readiness Gap Audit](engineering/reviews/REVIEW-20260731-sandbox-commercial-readiness-gap-audit.md) records the current four-repository No-Go decision and the additional missing internal-control-plane, interactive-terminal, Secret-projection, cloud-data-governance, and compatibility gates. REQ-2026-0025 now supplies the value-free Runtime Secret Projection Gate 0 candidate, but no Secret Authority or projection mechanism is approved. REQ-2026-0026 now supplies the Cloud Data Residency/Recovery Gate 0 candidate, but no region, replication, backup or restore mechanism is approved. REQ-2026-0027 now supplies the immutable cross-repository release-set compatibility Gate 0 candidate, but no Release Authority, registry, mixed-version evidence, rollout or rollback mechanism is approved. Docker remains deferred. The Service Host draft Bootstrap/Composition contracts resolve common, Local, Cold Firecracker, Cloud Firecracker, Command/Terminal and optional Pool dependencies with fail-closed status rules. REQ-2026-0021 composes Workspace Revision authorization, allocation, attachment, execution, checkpoint, compensation, sanitization and release across Local and Firecracker lanes; Agents alone promotes Workspace Revisions. REQ-2026-0022 adds the Local-only four-repository data-residency/recovery Gate: `standalone` and Local Provider selection do not prove device locality, and an all-data claim remains unavailable until every declared store, transfer, backup, restore and purge path has real evidence. All REQ-2026-0010 through REQ-2026-0027 runtime gates remain draft and disabled. REQ-2026-0018 still requires the SQL subject migration, REQ-2026-0020 still requires approved lifecycle retention/migration, and no static Gate 0 evidence is a production runtime or commercial claim.

## Verification

```bash
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node tools/check-sandbox-commercial-readiness.mjs
```
